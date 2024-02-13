---
layout: post
title:  Scaling Elasticsearch for Fun & Profit
lede: A walkthrough of my experience scaling an Elasticsearch cluster, discussing all the practical changes I made that led to improved performance for the cluster.
tag: howto
date: 2024-01-24
---

I have been managing an Elasticsearch cluster at work for over 3 years. This time has been a constant learning experience to say the least. When I started working on this cluster, we were using a cloud provider that gave us exactly one tool for scaling up: a slider to provision more nodes and larger nodes. The standard practice at the time was to slide the slider up whenever the cluster started acting up[^1]. This would give us "more capacity" for a couple months and then the acting up process would start all over again. This method of scaling also had the notable side effect of generating massive bills.

This post is a list of everything I tried that gave me positive results when the cluster was handling load or a concept that was important in helping me understand more about how Elasticsearch runs. The list is in no particular order, but I tried to group it by topic to make it easier to read. The most important takeaway you can have from this post is to make sure you are monitoring enough to see what effect each change has on performance as you apply it. This will help you determine what the cluster is struggling with the most and help you prioritize what to try next.

At the time of my applying the techniques described below we were using Elasticsearch 6, but I think a lot of this advice is applicable on Elasticsearch 7 as well. After version 7.10, Elastic changed licenses for Elasticsearch and it is no longer open source, so buyer beware. :)

### General Advice

* **Start with 3 large generic nodes and go as far as you can with this.**

  Specialized nodes increase complexity and cost quite a bit but don't necessarily speed up writes or searches. Best to stay on the simplest possible cluster configuration and focus on optimizing your indexes and data.

* **Pay someone else to run your cluster**

  We have a vendor who runs the actual hardware for our cluster. They manage the nodes and provisioning; we manage the data in the cluster. I highly recommend this if you have the budget, running a cluster yourself would 10x the difficulty of managing Elasticsearch in your system unless you have someone on your team with this specific expertise. It's worth it to pay someone else for this.

* **Learn the terminology**

  Spend the time reading the [docs](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/elasticsearch-intro.html) to learn the terminology specific to Elasticsearch because this will make life much easier when you need to find answers on the Internet. Not to mention you will pick up a ton of incidental knowledge about how Elasticsearch works which makes working on it a lot easier.

* **Be aware of the default settings of the `elasticsearch-transport` library.**

  For example, [the Ruby version retries a request up to 3 times by default](https://github.com/elastic/elasticsearch-ruby/tree/7.16/elasticsearch-transport#retrying-on-failures) if it fails on a connection issue or a timeout. For us, this led to compounding issues on the cluster whenever we had enough load that the cluster started to reject some requests because they would all immediately retry 3 times instead of going through our exponential backoff retry cycle (more on this in a later section).

* **Monitor the Write and Search queue size and rejections**

  This is the best ["canary in the coal mine"](https://en.wikipedia.org/wiki/Sentinel_species) indicator for when your cluster is starting to struggle. Each node in your cluster has as Write and Search queue. Incoming requests are automatically queued into these depending on whether they are a write requests or a search requests and then handled in order.

  If these queues fill up the cluster will immediately start rejecting requests with an error. When this happens, you will see a spike in the rejections stats that the cluster emits in the metrics. A few of these here and there are normal and should get handled by your retry logic, however if these start to add up, you need intervention or you're going to have a bad time.

* **Don't put Elasticsearch in the hot path**

  In my experience, having Elasticsearch in the hot path does not go well as soon as you scale to the point of having a decent amount of load on the server. If your site requires Elasticsearch to be instantly responsive to a request to load a main page, you're going to have a bad time.


### Index Management

* **Use aliases**

  Without aliases, managing your indexes will become very difficult without requiring scheduled downtime for your cluster. Aliases give you a way to perform a lot of index maintenance tasks, such as re-indexing, while always having a live index in use by users.

* **Some settings can only be changed on index creation**

  Be aware of certain settings that can only be changed at index creation time like `number_of_shards` for example. Changing these after the index is created requires creating a whole new index and migrating the data to it. If you have large indexes, this can take several hours. Switching indexes is when your aliases will come in handy.

* **Avoid using anything other than default index settings.**

  The defaults will take you a long way and by the time you might need to fiddle with a lot of these, you will have learned enough to know what they do and how they might affect the system. After 4 years of running this cluster, the only setting I have needed to change on an index is `number_of_shards`.

* **Indexes that have different workloads on the same cluster is difficult**

  Let's say you have an index that is a mostly static dataset but gets searched all the time, and you have a second index that receives tons of writes but doesn't get searched that much. It can be difficult to tune the cluster well for opposite workloads like this. The reason for this is that you essentially have one shared pool of resources on each node, so if you optimize too much for writes, then search performance will become resource constrained and begin to suffer and vice versa. It's good to be aware of this and always maintain a good balance when tuning.

* **Primary shard vs Replica shards**

  You should set `number_of_shards` (aka primary shards) to the number of data nodes in your cluster and `number_of_replicas` to `1` to ensure that the index has an even distribution of shards across the cluster. This will result in the index having a primary shard and a replica shard on each node in the cluster which is ideal. For larger indexes you can set `number_of_shards` higher but it should always be a multiple of the number of data nodes in the cluster to ensure that you have even distribution. Having an uneven distribution of shards can unbalance the load between nodes and lead to some nodes running hot while others are under-utilized.

* **~50GB per shard is a good rule of thumb.**

  Aim for ~50GB per shard as a maximum shard size. Shards that are larger than this will become slow to search and write to and other operational tasks the cluster performs in the background (i.e. merges) will become less performant. If your index starts to exceed 50GB per shard, you may want to increase the `number_of_shards` on that index.


### Handling Writes Gracefully

* **Do not make write requests inline with a web request.**

  Elasticsearch by its nature is slow at writes compared to a relational database like Postgres. This is because to write a new object, Elasticsearch isn’t just inserting the data in the index, it’s also processing it by whatever rules you have set up to index it for searching.  This takes a lot of time, especially if you have more complex search requirements.  The best solution for this is to farm this out to an asynchronous process, like a job queue or data stream for processing later.

* **Implement exponential backoff for retries.**

  Under conditions where the cluster is having trouble keeping up with the amount of load, you definitely don’t want your jobs to keep slamming it with the same write request over and over. If it tells you it needs help, give it some help in the form of backing off the retries exponentially. Basically instead of retrying a failed job every second, you would instead retry after 1 second, 2 seconds, 4 seconds, 16 seconds, etc.

* **Use the Bulk API and actually do writes in batches**

  The [Bulk API](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/docs-bulk.html) was added by Elasticsearch to handle indexing and deleting operations in bulk. This is much faster than sending requests through the Index or Delete APIs for individual documents. Every blog post you can find will tell you this.

* **Build indexes with a document structure that requires as few updates as possible**

  When Elasticsearch updates a document in the index with new values, it doesn't update the existing document in place. Instead, it creates a new document, indexes that document from scratch, then deletes the old document. Not only is this slow, but it also leads to bloated indexes because the deleted documents do not get removed from the index, they just get marked as deleted. I have seen indexes with more than 100GB of bloat due to this issue, to the point where we have to periodically run manual re-indexing operations on our larger indexes to keep them from becoming too bloated. This takes several hours to run on a large index.

  A better path forward here is to construct your index in a way where you can basically append new data to it if possible. For example, if we have an index of containing documents that represent text message conversations that might look something like this:
  ```json
  {
    "_source": {
      "id": <conversation_id>,
      "messages": [
        { "id": <message_id>, "body": "message 1" },
        { "id": <message_id>, "body": "message 2" }
      ]
    }
  }
  ```
  Each time we receive a new message for a conversation, we update the conversation in the index to add the new message body in the messages list for the conversation. This requires Elasticsearch to reindex the entire conversation document for search even though most of the data is unchanged. This means we're using cluster resources to index the same data repeatedly, while leaving deleted versions of the conversation laying around and filling up the storage space.

  However, since we know that once a text message is sent, the body of the message doesn't change, we could refactor this index to be an index of messages instead of conversations:
  ```json
  {
    "_source": {
      "id": <message_id>,
      "conversation_id": <conversation_id>,
      "body": "message 1",
    }
  },
  {
    "_source": {
      "id": <message_id>,
      "conversation_id": <conversation_id>,
      "body": "message 2",
    }
  }
  ```
  This enables several benefits that we didn't have using the old structure.
    * Small, concise documents for quicker indexing on write.
    * No updates, just add new messages as new documents.
    * Ability to use the [Rollover Index API](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/indices-rollover-index.html) to manage size of the index.
    * No bloating of deleted documents over time which removes the need to Reindex periodically
    * More CPU resources available for search requests since they aren't being spent on writing whole conversations repeatedly.

* **Documents in the index should have a flat structure**

  Documents in the index should have as flat a structure as possible.  Having a deeply nested structure doesn't perform well because Elasticsearch separately indexes each node in the document as a separate document which takes a lot of processing power on write and leads to large, bloated indexes which need more shards, which then makes search slower.


### Monitoring

Here is the list of metrics I've found helpful to monitor over the years.

#### ES Node Stats

* Searches and writes
* Write queue size
* Write queue rejections
* Search queue size
* Search queue rejections

#### ES Index Stats

* Searches and writes
* Data size
* Document count
* Shard count

#### Job Stats

* Queue lag
* Time to process

### Conclusions

So if you've made it this far into reading this, good luck with your cluster! Elasticsearch can run quite well if you are thoughtful about how you structure your data and set up your interactions between the application and cluster well. Our cluster has gone from being a consistent source of outages to stable enough that it "Just Runs" and reaching that point feels like real success. It can be done!

_Footnotes:_

[^1]: Acting up, in this case, being defined as the cluster becoming unresponsive due to being unable to process the volume of requests it was receiving. This ultimately would cause the site to go down because the web servers would be saturated with requests that were waiting on responses from the cluster.
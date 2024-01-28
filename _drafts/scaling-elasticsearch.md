---
layout: post
title:  Scaling Elasticsearch for Fun & Profit
category: howto
date: 2024-01-24
---

I have been managing our Elasticsearch cluster at work for over 3 years. This time has been a constant learning experience to say the least. When I started working on this cluster we were on a cloud provider that gave us a slider for larger and more nodes. The standard practice at the time was to slide the slider up whenever the cluster started acting up[^1]. This would give us "more capacity" for a couple months and then the acting up process would start all over again. This method of scaling also had the notable side effect of generating massive bills. This forced us to look deeper into how to manage the workloads that we were giving it.

This post is a list of everything I tried that gave me positive results or a concept that was important in helping me understand more about how Elasticsearch runs. The list is in no particular order but I tried to group it by topic to make it easier to read. The most important take away you can have from this post is to make sure you are monitoring enough to see what effect each change has on performance as you apply it. This will help you determine what the cluster is struggling with the most and help you prioritize what to try next.

At the time of my applying the techniques described below we were using Elasticsearch 6 but I think a lot of this advice is applicable on Elasticsearch 7 as well.

## Advice in every blog post I've ever read
* Use the Bulk API

### General Knowledge
* Be aware of certain settings that can only be changed at index creation time like `number_of_shards` for example. Changing these after the index is created required creating a whole new index and migrating the data to it. If you have large indexes, this will take sometimes several hours.

### General Advice
* Use aliases, otherwise index management is going to be hard without taking your system offline
* If your dataset is constantly changing and involves updating documents frequently, Elasticsearch is not going to like this
* Start with 3 large generic nodes and go as far as you can with this.  Specialized nodes increase complexity quite a bit and didn't necessarily speed up writes or searches.
* In fact avoid using anything other than default index settings.  These will take you a long way and by the time you might actually need to fiddle with a lot of these, you will actually have learned  enough to know what they do and how they might affect the system
* Spend the time reading the docs to learn the terminology because this will make googling for advice much much much easier.
* Beware the default settings of the elasticsearch-transport library.  The ruby version retries a request up to 3 times by default if it fails on a connection issue or a timeout.
* Be aware of how many requests you need to satisfy and ensure you have enough room in the thread pool queue for that amount of requests.  If not, add more nodes
* having indexes that have different workloads on the same cluster is difficult because you can't fully tune writes without affecting reads
* Shoot for ~50GB per shard as a maximum but more importantly watch your index performance and search/write queuing and respond accordingly
* Documents in the index should have as flat a structure as possible.  Having a deeply nested structure doesn't perform well because Elasticsearch separately indexes each node in the document which takes a lot of processing power on write and leads to large, bloated indexes which need more shards, which then makes search slower
* Send writes to your cluster through a queue and implement an exponential backoff in the retry policy.  This helps immensely when your cluster is being overwhelmed with work and write start failing.  It backs off the pressure to allow the cluster to catch up to the work and you won't lose any data when the request fails or hold up any other part of your system when the cluster is running behind.
* Don't put Elasticsearch in the hot path
* Don't do writes inline, make them asynchronous with exponential backoff

### Monitoring
* Write queue/rejections
* Search queue/rejections
* node health: writes per nodes, searches per node
* writes per index from the cluster's perspective
* searches per index from the cluster's perspective
* job queue lag
* job perform time
*

### Periodic maintenance
* Reindex to control bloat
* Monitor write rejections/search rejections and queueing


### Index settings that help throughput
* index.refresh_interval
* index.translog.durability = async  (turns out this did not help and actually made write performance worse)
* shard count
  * replicas at 1, primaries at 1 per node is index is large or actively updates.  If index is actively searched then increase replicas so that each node is guaranteed to have a copy of each shard for the index

with 3 primary, 1 replica
* Node 1

      Primary A
      Replica B
* Node 2

      Primary B
      Replica C
* Node 3

      Primary C
      Replica A

with 3 primary, 2 replica
* Node 1

      Primary A
      Replica B
      Replica C
* Node 2

      Primary B
      Replica C
      Replica A
* Node 3

      Primary C
      Replica A
      Replica B

[^1]: Acting up, in this case, being defined as the cluster becoming unresponsive due to being unable to process the volume of requests it was receiving at the time. This ultimately cause the site to go down because the web servers would be saturated with requests that were waiting on responses from the unresponsive cluster.
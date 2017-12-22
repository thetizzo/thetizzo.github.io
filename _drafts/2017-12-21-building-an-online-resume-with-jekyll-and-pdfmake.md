---
layout: post
title:  Building An Online Resume With Jekyll & pdfmake
category: howto
date: 2017-12-21
---

Recently it dawned on me that I am a web developer but I was still manually maintaining my resume in a Word document.  This was less than ideal because it was difficult to version the document and did little to show off any of my relevant skills in web development. To solve this problem I decided that I should build an online version of my resume which I could use to show prospective employers that I can, in fact, build things on the Internet.

I started off by grabbing all the existing data from my current resume and manually building it into HTML so that I could put it into my site. I then had a new problem. If I had to update my resume for any reason, I now had to make that update in two places; once on the web page and once for the Word document.

At this point I took a step back and thought about what my requirements really were. I needed the following:

* One source of data to rule them all
* Ability to render different formats (HTML, PDF)
* PDF needs to be generated automatically from the Jekyll data so it's always up to date
* PDF need to be generated client side since my site is GitHub Pages based so it can't be done on the server

Enter [Jekyll Data Files](https://jekyllrb.com/docs/datafiles/) and [pdfmake](http://pdfmake.org/#/) to save the day!

## Jekyll Data Files
Built into Jekyll is a super handy way to create your own sets of data and make them available to the site as a whole.

To do this you simply add a directory called `_data` to your Jekyll project, then add a file in this directory with the name of the data set you want to represent.  In my case this file is called `resume.yml`.   This can be referenced elsewhere in the project with `site.data.resume`. Jekyll supports JSON, CSV, or YAML formats for these data files.  I used YAML because, for me, it's the most readable.

At this point it was trivially easy to use this data to generate my resume because I could simply loop through the data to build various sections of my resume.  As an example, here is the code that builds the jobs section:

{% gist thetizzo/53ffda1d1fe2e3ec1f5b7ca2e4fa385c %}

At this point I had a working web page for my resume of but I still needed to make a downloadable format available.

## pdfmake
Since I run my Jekyll site on GitHub Pages, I am restricted in terms of the amount of server side processing that I can do so I had to find a library that was capable of generating the PDF on the client side. I tried out several JavaScript libraries capable of converting JSON into PDF in the browser.  The winner ended up being `pdfmake` because it has good documentation and was the easiest for me to get up and running.

In order for pdfmake to do it's magic though, I needed to get the data for my resume onto the client side in JSON format.  Thankfully this is trivially easy in Jekyll.  I just put it into a hidden div on the same page as the HTML resume and converted the data hash to JSON with Liquid's very handy `jsonify` utility.

{% gist thetizzo/56ebd705e934203276ce82d2b9e4b412 %}

I then wrote a simple JS function that processes the JSON and builds document definition object that includs styles and formatting that pdfmake needs to be able to generate the PDF.  That function can be found [here on GitHub.](https://github.com/thetizzo/thetizzo.github.io/blob/master/assets/javascripts/resume.js)

And that's pretty much it!  The final product can be found on my site here: [thetizzo.com/resume](/resume)

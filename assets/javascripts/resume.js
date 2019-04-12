"use strict";

$(document).ready(function() {
  var generateResume = function() {
    var resumeContent = $.parseJSON($('#resumeJson').text());

    var docDefinition = {
      content: [],
      styles: {
        name: {
          fontSize: 40,
          bold: true
        },
        section_heading: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        },
        company_name: {
          fontSize: 15,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        project_heading: {
          fontSize: 15,
          bold: true
        },
      }
    };

    var content = docDefinition['content']

    var sectionHeading = function(text, options) {
      return { text: text, style: 'section_heading' };
    };

    var list = function(items) {
      if (items === undefined) {
        return {};
      }
      return { ul: items, margin: [20, 0, 20, 0] };
    };

    var headerLine = function() {
      content.push({
        canvas: [{
          type: 'line',
          x1: 0, y1: 6, x2: 595-2*40, y2: 6,
          lineWidth: 1
        }]
      });
    };

    var dashedHeaderLine = function() {
      content.push({
        canvas: [{
          type: 'line',
          x1: 100, y1: 20, x2: 495-2*40, y2: 20,
          dash: { length: 1 },
          lineWidth: 1
        }]
      });
    };

    // Header
    content.push({ text: resumeContent['name'], style: 'name'});

    content.push({
      stack: [
        { text: resumeContent['title'], italics: true },
        { text: [{ text: 'Email: ', bold: true, italics: true }, resumeContent['contact_email']] },
        { text: [{ text: 'GitHub: ', bold: true, italics: true }, resumeContent['github_handle']] }
      ],
      alignment: 'right',
      margin: [0, -45, 0, 0]
    });

    headerLine();

    // Experience
    content.push(sectionHeading('Experience & Amazing Feats'));

    $.each(resumeContent['jobs'], function(i, job) {
      content.push({ text: job['company']['name'], style: 'company_name' });

      $.each(job['positions'], function(i, position) {
        content.push({
          text: [
            { text: position['title'], bold: true },
            ' (' + position['duration'] + ')'
          ]
        });
      });

      content.push({ text: job['description'], margin: [0, 5, 0, 0]});
      content.push('\n');
      content.push(list(job['accomplishments']));

      if(!(job['company']['name'] === 'Avaya')) {
        dashedHeaderLine();
      }
    });

    // Open Source
    content.push(sectionHeading('Open Source Projects'));

    $.each(resumeContent['projects'], function(i, project) {
      content.push({
        stack: [
          { text: project['name'], style: 'project_heading' },
          { text: project['description'], margin: [0, 5, 0, 0] }
        ],
        margin: [0, 15, 0, 5]
      });

      var items = []
      if(project['website']) {
        var website = project['website'].split('//')[1]
        items.push({
          text: [
            { text: 'Available on RubyGems', bold: true },
            { text: ' (' + website + ')', italics: true }
          ]
        });
      }

      if(project['code']) {
        var website = project['code'].split('//')[1]
        items.push({
          text: [
            { text: 'Code on GitHub', bold: true },
            { text: ' (' + website + ')', italics: true }
          ]
        });
      }

      content.push(list(items));
    });

    // Skills
    var skillsHeading = sectionHeading('Skills To Pay The Bills');
    skillsHeading['pageBreak'] = 'before';
    content.push(skillsHeading);

    var skillsTable = [[],[]];

    $.each(resumeContent['skills'], function(category, skills) {
      skillsTable[0].push([{ text: category, style: 'project_heading'}]);
      skillsTable[1].push([{ stack: skills }]);
    });

    content.push({
      table: {
        widths: ['*', '*', '*', '*'],
        body: skillsTable
      },
      margin: [0, 10, 0, 0],
      layout: 'noBorders'
    });

    // Education
    content.push(sectionHeading('Education'));

    content.push({
      stack: [
        { text: resumeContent['education']['school'], style: 'project_heading' },
        { text: resumeContent['education']['degree'], italics: true },
        { text: [{ text: 'Graduated: ', bold: true }, resumeContent['education']['graduated']]}
      ],
      margin: [0, 15, 0, 0]
    });

    return pdfMake.createPdf(docDefinition).download('Jason_Taylor_resume.pdf');
  };

  $('[data-toggle=download-pdf]').on('click', function(e) {
    e.preventDefault();
    generateResume();
  });
});

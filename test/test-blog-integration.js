'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const { Blog } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];

  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogData());
  }
  return Blog.insertMany(seedData);
}

function generateAuthor() {
  const names = [
    {
      author: {
        firstName: faker.name.firstName,
        lastName: faker.name.lastName
      }
    },
    {
      author: {
        firstName: faker.name.firstName,
        lastName: faker.name.lastName
      }
    },
    {
      author: {
        firstName: faker.name.firstName,
        lastName: faker.name.lastName
      }
    }
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function generateBlogTitle() {
  const titles = [
    'The Hero With no Heroics',
    'Even Batman Cries Sometimes',
    'What-What in The...',
    'There Once Was a Girl From Nantucket',
    'Sensitive Vikings (Yeah, They Were Real'
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generageBlogContent() {
  const content = [
    faker.lorem.sentences(),
    faker.lorem.sentences(),
    faker.lorem.sentences(),
    faker.lorem.sentences(),
    faker.lorem.sentences()
  ];
  return content[Math.floor(Math.random() * content.length)];
}

function generageDateCreated() {
  const created = [
    faker.date.past(),
    faker.date.past(),
    faker.date.past(),
    faker.date.past(),
    faker.date.past()
  ];
  return created[Math.floor(Math.random() * created.length)];
}

function generateBlogData() {
  return {
    author: generateAuthor(),
    content: generageBlogContent(),
    title: generateBlogTitle(),
    created: generageDateCreated()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });
  beforeEach(function() {
    return seedBlogData();
  });
  afterEach(function() {
    return tearDownDb();
  });
  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all existing blog posts', function() {
      let res;
      return chai
        .request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf.at.least(1);
          return Blog.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });

    it('should get blog posts with correct fields', function() {
      let resPost;
      return chai
        .request(app)
        .get('/posts')
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(blog) {
            expect(blog).to.be.a('object');
            expect(blog).to.include.keys(
              'id',
              'author',
              'content',
              'title',
              'created'
            );
          });
          resPost = res.body[0];
          return Blog.findById(resPost.id);
        })
        .then(blog => {
          expect(resPost.title).to.equal(blog.title);
          expect(resPost.content).to.equal(blog.content);
          expect(resPost.author).to.equal(blog.authorName);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {
      const newBlog = generateBlogData();

      return chai
        .request(app)
        .post('/posts')
        .send(newBlog)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id',
            'author',
            'content',
            'title',
            'created'
          );
          expect(res.body.id).to.not.be.null;
          expect(res.body.author).to.equal(
            `${newBlog.author.firstName} ${newBlog.author.lastName}`
          );
          expect(res.body.content).to.equal(newBlog.content);
          expect(res.body.title).to.equal(newBlog.title);
          return Blog.findById(res.body.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(newBlog.title);
          expect(blog.content).to.equal(newBlog.content);
          expect(blog.author.firstName).to.equal(newBlog.author.firstName);
          expect(blog.author.lastName).to.equal(newBlog.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update fields you send', function() {
      const updateData = {
        title: faker.lorem.sentence(),
        content: faker.lorem.sentences()
      };

      return Blog.findOne()
        .then(function(blog) {
          updateData.id = blog.id;
          return chai
            .request(app)
            .put(`/posts/${blog.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return Blog.findById(updateData.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(updateData.title);
          expect(blog.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('delete a blog post by id', function() {
      let blog;
      return Blog.findOne()
        .then(function(_blog) {
          blog = _blog;
          return chai.request(app).delete(`/posts/${blog.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return Blog.findById(blog.id);
        })
        .then(function(_blog) {
          expect(_blog).to.be.null;
        });
    });
  });
});

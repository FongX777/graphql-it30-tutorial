# GraphQL Tutorial For ITHelp 30-day Ironman Contests

![img](https://ithelp.ithome.com.tw/images/ironman/10th/iron-logo-10th.png)

[![CircleCI](https://img.shields.io/circleci/build/github/FongX777/graphql-it30-tutorial.svg?style=plastic)](https://circleci.com/gh/FongX777/graphql-it30-tutorial) [![codecov](https://img.shields.io/codecov/c/github/FongX777/graphql-it30-tutorial.svg?color=blue&style=plastic)](https://codecov.io/gh/FongX777/graphql-it30-tutorial) ![license](https://img.shields.io/badge/license-MIT-green.svg?style=plastic) [![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg?style=plastic)](https://lernajs.io/)

## Overview

![img](https://ithelp.ithome.com.tw/upload/images/20181016/20111997WWqgh86nkr.png)

This is a project to put all tutorial codes I mentioned in the ITHelp Ironman Contest. Here are some subprojects:

1. Developing a GraphQL server for a blog system

   - Queries and Mutations
   - Authentication and Authorization
   - Refactor and Organization
   - Introduce into Database

2. Dataloader Demo

3. Authentication and Authorization

4. Fullstack tutorial for a blog system

## File Structure

The project is split into two folders:

- `tutorials`: tutorial documentes
- `projects`: demo codes to support tutorials

## Installation

To run the project, first run these commands:

```bash
$ npm install # installs lerna
$ npm run bootstrap # connects all the packages
```

## Techs

Here's some npm packages I used for developing.

### Server

- apollo-server
- graphql

### Encryption

- bcrypt
- jsonwebtoken

### Testing

- [jest](https://jestjs.io/) - testing framework
- [apollo-server-testing](https://www.apollographql.com/docs/apollo-server/features/testing) - mocking an apollo server for testing

## References

- https://www.apollographql.com/docs/apollo-server/features/testing
- https://circleci.com/docs/2.0/language-javascript/



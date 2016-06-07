# Formal Wear

Formal Wear is an app for students in organizations like FBLA and DECA to get feedback on their formal attire. When preparing for competition, it's easy to forget about clothes - an important element of a presentation! Formal Wear helps users get actionable feedback from others.

## Links
* [Description of the design and technical decisions behind Formal Wear are available on my website. ](http://andrey.ninja/detail/formalwear)
* [Formal Wear can be downloaded from Google Play.](https://play.google.com/store/apps/details?id=com.andrey.formalwear&hl=en)

## Technologies

The app for Formal Wear is created using Ionic Framework, which gives great flexibility in allowing the app to be compiled for any platform without needing to re-write any code. Right now, the app is only downloadable from Google Play, but that will change as I work to expand it.

The back-end for Formal Wear runs on Node.JS and MongoDB. This standardizes the programming language of Formal Wear to Javascript on both the front-end and back-end, making development much easier.

Images are stored on an S3 bucket by default.

## Running the server

In order to run the server, ensure that both Node and Mongo are installed and configured. Run `npm install` to install dependencies. Rename `config.example.js` to `config.js` and set the correct values. Then, run the server with `node server.js`!

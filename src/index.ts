import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

import cors from "cors";


import connectRedis from "connect-redis";
//import session from "express-session";
import Redis from "ioredis";

const cookieSession = require("cookie-session");

import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import path from "path";
import { Updoot } from "./entities/Updoot";
const session = require("express-session");

const main = async () => {
  //@ts-ignore
  const conn = await createConnection({
    type: "postgres",
    database: "reddit",
    username: "postgres",
    password: "password",
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Updoot],
  });



  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();


  app.use(
    cors({
      //origin: 'https://studio.apollographql.com',
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    cookieSession({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
        httpOnly: false,
        sameSite: "lax",
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: "RandomStringToHide",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }), //this is accessible from all the resolvers!
  });

  redis.on("error", function (err) {
    console.log("Could NOT establish a connection with REDIS. " + err);
  });

  await apolloServer.start();


  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(5000, () => {
    console.log("Server started on localhost:5000");
  });
};

main().catch((error) => {
  console.error(error);
});

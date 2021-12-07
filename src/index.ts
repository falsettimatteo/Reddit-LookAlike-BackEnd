import "reflect-metadata"
import {MikroORM} from "@mikro-orm/core"
import { __prod__ } from "./constants"; 
import microConfig from './mikro-orm.config';
import express from 'express'
import {ApolloServer} from 'apollo-server-express'
import {buildSchema} from 'type-graphql'
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";


import connectRedis from 'connect-redis';
import { MyContext } from "./types";
import session from 'express-session';

const cookieParser = require('cookie-parser');

const redis = require('redis');


const main = async () => {

    
const orm =await MikroORM.init(microConfig);
await orm.getMigrator().up();

 const app = express();

 const RedisStore =  connectRedis(session);
 const redisClient = redis.createClient();
 
 app.use(
   session({
       name: 'qid-COOKIE',
     store: new RedisStore({ client: redisClient,
     disableTouch: true,
     host: '127.0.0.1',
     port: 6379,
     }),
     cookie: {
         maxAge: 1000 *60 *60 *24 *365 * 10, //10 years
         httpOnly: true,
         sameSite:'none',
         secure: __prod__,
     },
     saveUninitialized: false,
     secret: 'RandomStringToHide',
     resave: false,
   })
 )
 app.use(express)


const apolloServer = new ApolloServer({
    schema: await buildSchema({
        resolvers: [HelloResolver, PostResolver, UserResolver],
        validate: false,

    }),
    context: ({req,res}): MyContext => ({ em: orm.em, req,res })  //this is accessible from all the resolvers!
})
await redisClient.connect();

await apolloServer.start();
const cors = {
    credentials: true,
    setCredentials: 'include',
    origin: 'https://studio.apollographql.com'
}

apolloServer.applyMiddleware({ app, cors });



app.listen(5000, () => {
        console.log('Server started on localhost:5000');
    })
    
};

main().catch(error => {
    console.error(error);
});


console.log("Hello World");

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
import session from 'express-session';
import cors from 'cors';
import * as redis from 'redis';


const main = async () => {

    
const orm =await MikroORM.init(microConfig);
await orm.getMigrator().up();

 const app = express();
  
 const RedisStore =  connectRedis(session);
 const redisClient = redis.createClient();

 app.use(
     cors({
    //origin: 'https://studio.apollographql.com',
    origin: 'http://localhost:3000',
    credentials: true,

    
    })
 )
 
 app.use(
   session({
       name: 'QID',
     store: new RedisStore({ 
     client: redisClient,
     disableTouch: true,
     //host: '127.0.0.1',
     //port: 6379,
     }),
     cookie: {
         maxAge: 1000 *60 *60 *24 *365 * 10, //10 years
         httpOnly: false,
         sameSite:'lax',
         secure: __prod__,
     },
     saveUninitialized: false,
     secret: 'RandomStringToHide',
     resave: false,
   })
 )
 


const apolloServer = new ApolloServer({
    schema: await buildSchema({
        resolvers: [HelloResolver, PostResolver, UserResolver],
        validate: false,

    }),
    context: ({req,res}) => ({ em: orm.em, req,res })  //this is accessible from all the resolvers!
})
redisClient.on('error', function (err) {
    console.log('Could NOT establish a connection with REDIS. ' + err);
});

await apolloServer.start();
await redisClient.connect();

apolloServer.applyMiddleware({ app , cors: false});




app.listen(5000, () => {
        console.log('Server started on localhost:5000');
    })
    
};

main().catch(error => {
    console.error(error);
});

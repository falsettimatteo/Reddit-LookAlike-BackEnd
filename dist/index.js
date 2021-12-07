"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@mikro-orm/core");
const constants_1 = require("./constants");
const mikro_orm_config_1 = __importDefault(require("./mikro-orm.config"));
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const connect_redis_1 = __importDefault(require("connect-redis"));
const express_session_1 = __importDefault(require("express-session"));
const cookieParser = require('cookie-parser');
const redis = require('redis');
const main = async () => {
    const orm = await core_1.MikroORM.init(mikro_orm_config_1.default);
    await orm.getMigrator().up();
    const app = (0, express_1.default)();
    const RedisStore = (0, connect_redis_1.default)(express_session_1.default);
    const redisClient = redis.createClient();
    app.use((0, express_session_1.default)({
        name: 'qid-COOKIE',
        store: new RedisStore({ client: redisClient,
            disableTouch: true,
            host: '127.0.0.1',
            port: 6379,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: 'none',
            secure: constants_1.__prod__,
        },
        saveUninitialized: false,
        secret: 'RandomStringToHide',
        resave: false,
    }));
    app.use(express_1.default);
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, post_1.PostResolver, user_1.UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({ em: orm.em, req, res })
    });
    await redisClient.connect();
    await apolloServer.start();
    const cors = {
        credentials: true,
        setCredentials: 'include',
        origin: 'https://studio.apollographql.com'
    };
    apolloServer.applyMiddleware({ app, cors });
    app.listen(5000, () => {
        console.log('Server started on localhost:5000');
    });
};
main().catch(error => {
    console.error(error);
});
console.log("Hello World");
//# sourceMappingURL=index.js.map
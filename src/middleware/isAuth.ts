import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<MyContext> = ({context}, next) => {
    if(!context.req.session.cookie){
        throw new Error("not authenticated");
    }
    return next();

}
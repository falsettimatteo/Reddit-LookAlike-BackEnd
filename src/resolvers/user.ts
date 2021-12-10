
import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType, Query} from 'type-graphql'
import argon2 from 'argon2';
import { EntityManager } from '@mikro-orm/postgresql';

@InputType()
class UsernamePasswordInput{ //this is a second method to make inputs as @Arg
     @Field()
     username: string;

     @Field()
     password: string;
}

@ObjectType()
class FieldError {
    @Field()
    field: string
    @Field()
    message: string
}

@ObjectType()  // this a type made for the return of an error where error and user can be undefined
class UserResponse{
    @Field(() => [ FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User

}

@Resolver()
export class UserResolver{
    @Query(() => User, {nullable: true })
   async me(@Ctx() {req, em}: MyContext) {
        if(!req.session.cookie) {
            return null;
        }
        const ID = parseInt (req.session.cookie.toString());
        const user = await em.findOne(User, {id: ID});
        return user;
    }

    @Mutation( () => UserResponse)
    async register( 
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em, req}: MyContext 
    ): Promise<UserResponse> {
        if(options.username.length <= 2){
            return {
                errors: [{
                    field: 'username',
                    message: "lenght must be greater than 2"
                }]
            }
        }

        if(options.password.length <= 2){
            return {
                errors: [{
                    field: 'password',
                    message: "lenght must be greater than 2"
                }]
            }
        }
        const hashedPassword = await argon2.hash(options.password);
        let user;
        const date = new Date();
        try{
            const result = await (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
                username: options.username,
                password: hashedPassword,
                created_at: date,
                updated_at: date,
            }).returning("*");
            user = result[0];
        } catch(err) {
            //username already exist
            if(err.code === "23505") {
                return {
                    errors: [{
                        field: 'username',
                        message: 'username already taken'
                    }]
                }
            }
            console.log("Message: ", err);
        }
        req.session.cookie = user.id;
        return user;
    }

    //-----------------------------su Ctx va ,req e poi si fa req.session.userid = user.id ma non funziona
    @Mutation( () => UserResponse)
    async login( 
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em,req}: MyContext
    ): Promise<UserResponse> {
        const user:any = await em.findOne(User, {username: options.username});
        if(!user){
            return {
                errors: [{
                    field: 'username',
                    message: 'that username does not exist'
                }]
            }
        }
        const valid = await argon2.verify(user.password, options.password);
        if(!valid){
            return {
                errors: [{
                    field: 'password',
                    message: 'incorrect password' // usually invalid inputs
                }]
            }
        }
        if(user){
            req.session.cookie = user.id;
        }
        return {
            user
        };
    }
}
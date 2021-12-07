
import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType} from 'type-graphql'
import argon2 from 'argon2';

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

    @Mutation( () => UserResponse)
    async register( 
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
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
        const user = em.create( User, {username: options.username, password: hashedPassword});
        try{
        await em.persistAndFlush(user);
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
        return {user}
    }

    //-----------------------------su Ctx va ,req e poi si fa req.session.userid = user.id ma non funziona
    @Mutation( () => UserResponse)
    async login( 
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em,req}: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, {username: options.username});
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
        req.session.userid = user.id;
        return {
            user
        };
    }
}
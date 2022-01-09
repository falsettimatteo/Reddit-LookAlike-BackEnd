import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Resolver,
  Mutation,
  Arg,
  Field,
  Ctx,
  ObjectType,
  Query,
  FieldResolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType() // this a type made for the return of an error where error and user can be undefined
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
   @FieldResolver(() => String)
   email(@Root() user: User, @Ctx() {req}: MyContext){
     //if it is true, than the user logged in is the creator of the post
     if(req.session.cookie /*=== user.id*/){  //controllare se il coocie è uguale all'user.id passato _*_*_*_**_*_*_  
      return user.email;
     }
     return "";
   }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "lenght must be greater than 2",
          },
        ],
      };
    }

    const userId = await redis.get(FORGET_PASSWORD_PREFIX + token);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }
    const userIdNum = parseInt(userId);
    const user: any = await User.findOne(userIdNum);

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    await User.update({id : userIdNum}, {password: await argon2.hash(newPassword)})

    //after changing the user it logs in
    req.session.cookie = user.id;
    await redis.del(FORGET_PASSWORD_PREFIX + token) //this is the key
    return { user, };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({where: {email: email}});
    if (!user) {
      return true; //if the email does not exist does nothing
    }
    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    ); //expires in 3 day
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}"> reset password</a>`
    );
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    if (!req.headers.cookie) {
      return null;
    }
    const ID = parseInt(req.session.cookie.toString());
    console.log( "ID: " + ID);
    let user: any = req.session.cookie
    return await User.findOne( user );
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const error = validateRegister(options);
    if (error) {
      return { errors: error };
    }
    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await getConnection().createQueryBuilder().insert().into(User).values(
        {
        username: options.username,
          email: options.email,
          password: hashedPassword,
        }
      ).returning('*').execute();
      user = result.raw[0];
    } catch (err) {
      //username already exist
      if (err.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
      }
      console.log("Message: ", err);
    }
    if(user){
    req.headers.cookie = user.id;
    }
    return {user,}
  }

  
  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user: any = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: {email: usernameOrEmail} }
        : { where:  {username: usernameOrEmail} }
    );
    if (!user) {
      return {
        errors: [
          {
            field: "usernameorEmail",
            message: "that username does not exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect password", // usually invalid inputs
          },
        ],
      };
    }
    if (user) {

      req.session.cookie = user.id;
      console.log(req.session.cookie);
    }
    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req,res }: MyContext) {
    //@ts-ignore
    req.session = null;
    res.clearCookie(COOKIE_NAME);
    return true;
  }
}

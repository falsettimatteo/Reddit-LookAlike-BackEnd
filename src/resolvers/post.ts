import { Post } from "../entities/Post";
import {
  Resolver,
  Query,
  Arg,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
  FieldResolver,
  Root,
  ObjectType,
} from "type-graphql";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value! != -1;
    const realValue = isUpdoot ? 1 : -1;
    const userId = req.session.cookie as any;
    const hasVoted = await Updoot.findOne({ where: { postId, userId } });

    if (hasVoted && hasVoted.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(`
          update updoot
          set value = ${realValue}
          where "postId" = ${postId} and "userId" =${userId}
          `);

        await tm.query(`
          update post
          set points = points + ${2 * realValue}
          where id = ${postId}
          `);
      });
    } else if (!hasVoted) {
      await getConnection().transaction(async (tm) => {
        await tm.query(`
          insert into updoot ("userId", "postId", value)
          values (${userId}, ${postId}, ${realValue});
          `);
        await tm.query(`
          update public.post
      set points = points + ${realValue}
      where id = ${postId}
          `);
      });
    }

    // getConnection().query(`
    // START TRANSACTION;
    // insert into updoot ("userId", "postId", value)
    // values (${userId}, ${postId}, ${realValue});
    // update public.post
    // set points = points + ${realValue}
    // where id = ${postId};
    // COMMIT;
    // `);
    return true;
  }

  @Query(() => PaginatedPosts)
  async getPosts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null, //the cursor is used to set the starting point of the pagination
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1; //it search for 1 element more than the lmit to see if it has more posts
    const replacements: any[] = [realLimitPlusOne];

    if (req.session.cookie) {
      replacements.push(req.session.cookie);
    }
    let cursorIndx = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIndx = replacements.length;
    }

    const posts = await getConnection().query(
      `
     select p.*,
      json_build_object(
        'id', u.id,  
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
          ) creator,
         ${
           !!req.session.cookie
             ? `(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"`
             : 'null as "voteStatus"'
         }
      from public.post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $${cursorIndx}` : ""}
      order by p."createdAt" DESC
      limit $1`,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  getPost(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ["creator"] });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    const creatorCookie = parseInt(req.session.cookie.toString());
    return Post.create({
      ...input,
      creatorId: creatorCookie,
    }).save();
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title",) title: string,
    @Arg("text") text: string,
    @Ctx() {req}: MyContext
  ): Promise<Post | null> {

     const result = await getConnection()
     .createQueryBuilder()
     .update(Post)
     .set({title, text})
     .where('id = :id and "creatorId" = :creatorId', {id, creatorId: req.session.cookie})
     .returning("*")
     .execute();
     return result.raw[0] as any;

  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const post = await Post.findOne(id);
    if (!post) {
      return false;
    }
    if (
      req.session.cookie &&
      post.creatorId !== parseInt(req.session.cookie.toString())
    ) {
      throw new Error("not authorized");
    }
    await Updoot.delete({ postId: id });
    await Post.delete(id); // it returns always true | make it return false if error happens
    return true;
  }
}

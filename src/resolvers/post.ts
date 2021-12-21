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
      @Arg('postId', () => Int) postId: number,
      @Arg('value', () => Int) value: number,
      @Ctx() {req}: MyContext
  ){
    const isUpdoot = value !!= -1;
    const realValue = isUpdoot ? 1 : -1;
      const userId = req.session.cookie as any;
      console.log("USER ID: ", userId);
     
      
      getConnection().query(`
      START TRANSACTION;
      insert into updoot ("userId", "postId", value)
      values (${userId}, ${postId}, ${realValue});
      update public.post
      set points = points + ${realValue}
      where id = ${postId};
      COMMIT;
      `);
      return true;
  }

  @Query(() => PaginatedPosts)
  async getPosts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null, //the cursor is used to set the starting point of the pagination
    ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1; //it search for 1 element more than the lmit to see if it has more posts
    const replacements: any[]= [realLimitPlusOne];
    if(cursor){
     replacements.push(new Date(parseInt(cursor)));
    }
     const posts = await getConnection().query(`
     select p.*,
      json_build_object(
        'id', u.id,  
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
          ) creator
      from public.post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $2` : "" }
      order by p."createdAt" DESC
      limit $1`, replacements);

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect("p.creator", "u", 'u.uf = p."creatorId"')
    //   .orderBy('p."createdAt"', "DESC")
    //   .take(realLimitPlusOne);
    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }
    // const posts = await qb.getMany();
    return {
       posts: posts.slice(0, realLimit),
       hasMore: posts.length === realLimitPlusOne,
     };
  }

  @Query(() => Post, { nullable: true })
  getPost(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
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
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) {
      return null;
    }

    if (typeof title !== "undefined") {
      post.title = title;
      await Post.update({ id }, { title });
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    await Post.delete(id); // it returns always true | make it return false if error happens
    return true;
  }
}

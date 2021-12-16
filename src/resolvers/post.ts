import { Post } from '../entities/Post';
import {Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType} from 'type-graphql'
import { MyContext } from 'src/types';
import { isAuth } from '../middleware/isAuth';
import { getConnection } from 'typeorm';

@InputType()
class PostInput {
    @Field()
    title: string
    
    @Field()
    text: string
}

@ObjectType() 
class PaginatedPosts{
    @Field(() => [Post])
    posts: Post[];
    
    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver{

    @FieldResolver(() => String)
    textSnippet(
        @Root()root: Post
    ) {
        return root.text.slice(0, 50);
    }

    @Query( () => PaginatedPosts)
    async getPosts(
        @Arg('limit', () => Int)limit: number,
        @Arg('cursor', () => String, {nullable: true}) cursor: string | null,  //the cursor is used to set the starting point of the pagination
    ): Promise<PaginatedPosts> {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = Math.min(50, limit) +1; //it search for 1 element more than the lmit to see if it has more posts
        const qb = getConnection()
        .getRepository(Post)
        .createQueryBuilder("p")
        .orderBy('"createdAt"', "DESC")
        .take(realLimitPlusOne);
        if(cursor){
            qb.where('"createdAt" < :cursor',
             {cursor: new Date(parseInt(cursor))});
        }
        const posts = await qb.getMany();
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne,
        }
    }

    @Query( () => Post, { nullable: true})
    getPost( 
        @Arg( 'id' ) id: number): Promise<Post | undefined> {
        return Post.findOne(id);
    }

    @Mutation( () => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg( 'input') input: PostInput,
        @Ctx() {req}: MyContext): Promise<Post> {
            const creatorCookie = parseInt(req.session.cookie.toString()) 
           return Post.create({
               ...input,
               creatorId: creatorCookie,
           }).save();
    }

    @Mutation( () => Post)
    async updatePost( 
        @Arg( 'id') id: number,
        @Arg( "title", () => String, { nullable: true}) title: string): Promise<Post | null> {
            const post = await Post.findOne(id);
            if(!post){
                return null;
            }

            if( typeof title !== 'undefined'){
                post.title = title;
               await Post.update({id}, {title});
            }
        return post;
    }

    @Mutation( () => Boolean)
    async deletePost( 
        @Arg( 'id') id: number): Promise<boolean> {
        await Post.delete(id)    // it returns always true | make it return false if error happens
        return true;
    }
}
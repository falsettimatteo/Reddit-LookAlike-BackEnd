import { Post } from '../entities/Post';
import {Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware} from 'type-graphql'
import { MyContext } from 'src/types';
import { isAuth } from '../middleware/isAuth';

@InputType()
class PostInput {
    @Field()
    title: string
    
    @Field()
    text: string
}

@Resolver()
export class PostResolver{

    @Query( () => [Post])
    getPosts(): Promise<Post[]> {
        return Post.find();
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
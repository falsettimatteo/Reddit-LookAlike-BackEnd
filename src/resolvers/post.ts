
import { Post } from '../entities/Post';
import {Resolver, Query, Ctx} from 'type-graphql'
import { MyContext } from 'src/types';

@Resolver()
export class PostResolver{

    @Query( () => [Post])
    getPosts( @Ctx() {em}: MyContext): Promise<Post[]> {
        return em.find(Post, {});
    }
}
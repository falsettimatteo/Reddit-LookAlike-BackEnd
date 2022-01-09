import {Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from './Post';
import { User } from './User';


@Entity()
export class Updoot extends BaseEntity {


    @Column({type: "int"})
    value: number

    @PrimaryColumn()
    userId: number;

    @ManyToOne(() => User, user => user.updoot)
    user: User;

    @PrimaryColumn()
    postId: Date;

    @ManyToOne(() => Post, post => post.updoot, {

    })
    post: Date;

    

    
  
}

import {ObjectType, Field, Int} from 'type-graphql'
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Post } from './Post';
import { Updoot } from './Updoot';

@ObjectType() // creating the class for graphql, using with Field to create the parameters
@Entity()
export class User  extends BaseEntity{

    @Field( () => Int)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column({unique: true})
    username!: string;

    @Field()
    @Column({ unique: true})
    email!: string;

    @Column()  //the password in not exposed with Field()
    password!: string;

    @OneToMany(() => Post, post => post.creator)
    posts: Post[];

    @OneToMany(() => Updoot, updoot => updoot.user)
    updoot: Updoot[];

    @Field( () => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field( () => String)
    @UpdateDateColumn()
    updatedAt: Date;
  

}
import {ObjectType, Field} from 'type-graphql'
import {Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, BaseEntity, ManyToOne, OneToMany } from "typeorm";
import { Updoot } from './Updoot';
import { User } from './User';

@ObjectType() // creating the class for graphql, using with Field to create the parameters
@Entity()
export class Post extends BaseEntity {

    @Field( )
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    title!: string;

    @Field()
    @Column()
    text!: string;

    @Field()
    @Column({type: "int", default: 0})
    points!: number;

    @Field()
    @Column()
    creatorId: number;

    @Field()
    @ManyToOne(() => User, user => user.posts)
    creator: User;

    @OneToMany(() => Updoot, updoot => updoot.post)
    updoot: Updoot[];

    @Field( () => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field( () => String)
    @UpdateDateColumn()
    updatedAt: Date;

    

    
  
}
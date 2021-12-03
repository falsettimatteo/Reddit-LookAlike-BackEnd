import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import {ObjectType, Field, Int} from 'type-graphql'

@ObjectType() // creating the class for graphql, using with Field to create the parameters
@Entity()
export class User {

    @Field( () => Int)
    @PrimaryKey()
    id!: number;

    @Field( () => String)
    @Property( { type: 'date'})
    createdAt = new Date();

    @Field( () => String)
    @Property( { type: 'date', onUpdate: () => new Date() })
    updatedAt = new Date();

    @Field()
    @Property()
    username!: string;

    @Property()  //the password in not exposed with Field()
    password!: string;
  

}
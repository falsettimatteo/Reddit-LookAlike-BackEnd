import { InputType, Field } from "type-graphql";

@InputType()
export class UsernamePasswordInput {
  //this is a second method to make inputs as @Arg
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}

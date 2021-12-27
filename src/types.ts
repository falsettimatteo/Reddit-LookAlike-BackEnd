import {Request, Response} from 'express';
import { Redis } from "ioredis";


export type MyContext = {
    req: Request;
    res: Response;
    redis: Redis;
  }


  //https://dev.to/rasikag/learning-react-with-ben-awad-04-428n
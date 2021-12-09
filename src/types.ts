import { Connection, IDatabaseDriver, EntityManager } from "@mikro-orm/core";
import {Request, Response} from 'express';
import { Session } from "express-session";



export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
    req: Request & {session: Session & {userid?: number}}
    res: Response;
  }


  //https://dev.to/rasikag/learning-react-with-ben-awad-04-428n
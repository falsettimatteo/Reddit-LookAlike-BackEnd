import { Connection, IDatabaseDriver, EntityManager } from "@mikro-orm/core";
import {Request, Response} from 'express';
import session from "express-session"

export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
    req: Request & {session: session.Session & Partial<session.SessionData> & {userid?: number}};
    res: Response;
  }


  //https://dev.to/rasikag/learning-react-with-ben-awad-04-428n
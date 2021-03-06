"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostResolver = void 0;
const Post_1 = require("../entities/Post");
const type_graphql_1 = require("type-graphql");
const isAuth_1 = require("../middleware/isAuth");
const typeorm_1 = require("typeorm");
const Updoot_1 = require("../entities/Updoot");
let PostInput = class PostInput {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "title", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "text", void 0);
PostInput = __decorate([
    (0, type_graphql_1.InputType)()
], PostInput);
let PaginatedPosts = class PaginatedPosts {
};
__decorate([
    (0, type_graphql_1.Field)(() => [Post_1.Post]),
    __metadata("design:type", Array)
], PaginatedPosts.prototype, "posts", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], PaginatedPosts.prototype, "hasMore", void 0);
PaginatedPosts = __decorate([
    (0, type_graphql_1.ObjectType)()
], PaginatedPosts);
let PostResolver = class PostResolver {
    textSnippet(root) {
        return root.text.slice(0, 50);
    }
    async vote(postId, value, { req }) {
        const isUpdoot = value != -1;
        const realValue = isUpdoot ? 1 : -1;
        const userId = req.session.cookie;
        const hasVoted = await Updoot_1.Updoot.findOne({ where: { postId, userId } });
        if (hasVoted && hasVoted.value !== realValue) {
            await (0, typeorm_1.getConnection)().transaction(async (tm) => {
                await tm.query(`
          update updoot
          set value = ${realValue}
          where "postId" = ${postId} and "userId" =${userId}
          `);
                await tm.query(`
          update post
          set points = points + ${2 * realValue}
          where id = ${postId}
          `);
            });
        }
        else if (!hasVoted) {
            await (0, typeorm_1.getConnection)().transaction(async (tm) => {
                await tm.query(`
          insert into updoot ("userId", "postId", value)
          values (${userId}, ${postId}, ${realValue});
          `);
                await tm.query(`
          update public.post
      set points = points + ${realValue}
      where id = ${postId}
          `);
            });
        }
        return true;
    }
    async getUserPosts(userId, limit, cursor, { req }) {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = Math.min(50, limit) + 1;
        const replacements = [realLimitPlusOne];
        if (req.session.cookie) {
            replacements.push(req.session.cookie);
        }
        let cursorIndx = 3;
        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
            cursorIndx = replacements.length;
        }
        const posts = await (0, typeorm_1.getConnection)().query(`
   select p.*,
    json_build_object(
      'id', u.id,  
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
        ) creator,
       ${!!req.session.cookie
            ? `(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"`
            : 'null as "voteStatus"'}
    from public.post p
    inner join public.user u on u.id = p."creatorId"
    AND u.id = ${userId}
    ${cursor ? `where p."createdAt" < $${cursorIndx}` : ""}
    order by p."createdAt" DESC
    limit $1`, replacements);
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne,
        };
    }
    async getPosts(limit, cursor, { req }) {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = Math.min(50, limit) + 1;
        const replacements = [realLimitPlusOne];
        if (req.session.cookie) {
            replacements.push(req.session.cookie);
        }
        let cursorIndx = 3;
        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
            cursorIndx = replacements.length;
        }
        const posts = await (0, typeorm_1.getConnection)().query(`
     select p.*,
      json_build_object(
        'id', u.id,  
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
          ) creator,
         ${!!req.session.cookie
            ? `(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"`
            : 'null as "voteStatus"'}
      from public.post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $${cursorIndx}` : ""}
      order by p."createdAt" DESC
      limit $1`, replacements);
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne,
        };
    }
    getPost(id) {
        return Post_1.Post.findOne(id, { relations: ["creator"] });
    }
    async createPost(input, { req }) {
        const creatorCookie = parseInt(req.session.cookie.toString());
        return Post_1.Post.create(Object.assign(Object.assign({}, input), { creatorId: creatorCookie })).save();
    }
    async updatePost(id, title, text, { req }) {
        const result = await (0, typeorm_1.getConnection)()
            .createQueryBuilder()
            .update(Post_1.Post)
            .set({ title, text })
            .where('id = :id and "creatorId" = :creatorId', { id, creatorId: req.session.cookie })
            .returning("*")
            .execute();
        return result.raw[0];
    }
    async deletePost(id, { req }) {
        const post = await Post_1.Post.findOne(id);
        if (!post) {
            return false;
        }
        if (req.session.cookie &&
            post.creatorId !== parseInt(req.session.cookie.toString())) {
            throw new Error("not authorized");
        }
        await Updoot_1.Updoot.delete({ postId: id });
        await Post_1.Post.delete(id);
        return true;
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "textSnippet", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("postId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("value", () => type_graphql_1.Int)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("userId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(2, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "getUserPosts", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "getPosts", null);
__decorate([
    (0, type_graphql_1.Query)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "getPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("input")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PostInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("title")),
    __param(2, (0, type_graphql_1.Arg)("text")),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
PostResolver = __decorate([
    (0, type_graphql_1.Resolver)(Post_1.Post)
], PostResolver);
exports.PostResolver = PostResolver;
//# sourceMappingURL=post.js.map
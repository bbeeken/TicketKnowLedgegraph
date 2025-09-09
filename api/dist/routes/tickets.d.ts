import { FastifyInstance } from 'fastify';
declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            sub: number;
        };
    }
}
export declare function registerTicketRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=tickets.d.ts.map
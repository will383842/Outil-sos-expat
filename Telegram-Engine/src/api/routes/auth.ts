import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database.js";
import { authenticateUser } from "../middleware/auth.js";

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /login
  app.post<{ Body: LoginBody }>(
    "/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const payload = { id: user.id, email: user.email, role: user.role };
      const token = app.jwt.sign(payload);

      return reply.send({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    }
  );

  // POST /register (first user = admin, subsequent need admin JWT)
  app.post<{ Body: RegisterBody }>(
    "/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;

      if (!isFirstUser) {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Authentication required",
          });
        }
        if (request.user.role !== "admin") {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Only admins can register new users",
          });
        }
      }

      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name,
          passwordHash,
          role: isFirstUser ? "admin" : "ops",
        },
      });

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.status(201).send({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    }
  );

  // GET /me
  app.get(
    "/me",
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "User not found",
        });
      }

      return reply.send({ data: user });
    }
  );
}

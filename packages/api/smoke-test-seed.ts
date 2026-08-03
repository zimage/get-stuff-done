import { signAccessToken } from "@gsd/auth";
import { prisma } from "@gsd/db";

async function main() {
  const user = await prisma.user.upsert({
    where: { googleSub: "smoke-test-sub" },
    update: {},
    create: {
      googleSub: "smoke-test-sub",
      email: "smoke-test@example.com",
      name: "Smoke Test",
    },
  });

  const token = await signAccessToken({ userId: user.id }, process.env.JWT_SECRET ?? "dev-secret-change-me");
  console.log(JSON.stringify({ userId: user.id, token }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

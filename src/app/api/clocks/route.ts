import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Relógios de Tensão. Mestre vê todos; jogadores só os revelados.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const isMaster = session.user.role === ROLES.MASTER;
  const clocks = await prisma.clock.findMany({
    where: isMaster ? {} : { visivel: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ clocks, isMaster });
}

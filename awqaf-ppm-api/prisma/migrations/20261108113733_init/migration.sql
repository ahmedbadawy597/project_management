-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "allocation" INTEGER NOT NULL,
    "availability" INTEGER NOT NULL,
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "managerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plannedProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedStart" TEXT NOT NULL,
    "plannedEnd" TEXT NOT NULL,
    "forecastEnd" TEXT NOT NULL,
    "actualStart" TEXT,
    "phase" TEXT NOT NULL,
    "budgetApproved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slaCompliance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "riskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "summaryAr" TEXT NOT NULL DEFAULT '',
    "managerUpdate" TEXT NOT NULL DEFAULT '',
    "managerUpdateAr" TEXT NOT NULL DEFAULT '',
    "charter" TEXT NOT NULL DEFAULT '',
    "charterAr" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectApp" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "plannedStart" TEXT NOT NULL,
    "plannedEnd" TEXT NOT NULL,

    CONSTRAINT "ProjectApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WbsItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "baselineStart" TEXT NOT NULL,
    "baselineEnd" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigneeId" TEXT,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "description" TEXT,

    CONSTRAINT "WbsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "baselineDate" TEXT NOT NULL,
    "forecastDate" TEXT NOT NULL,
    "actualDate" TEXT,
    "status" TEXT NOT NULL,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliverablesAr" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaRecord" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "targetHours" DOUBLE PRECISION NOT NULL,
    "consumedHours" DOUBLE PRECISION NOT NULL,
    "compliance" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "warningThreshold" DOUBLE PRECISION NOT NULL,
    "openedAt" TEXT NOT NULL,
    "dueAt" TEXT NOT NULL,
    "escalationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SlaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,
    "mitigationAr" TEXT NOT NULL,
    "targetDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "overdue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetTransaction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "BudgetTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "submittedAt" TEXT NOT NULL,
    "decidedAt" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalComment" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" TEXT NOT NULL,

    CONSTRAINT "ApprovalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "at" TEXT NOT NULL,

    CONSTRAINT "ActivityItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "at" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "href" TEXT,

    CONSTRAINT "NotificationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "ProjectApp_projectId_idx" ON "ProjectApp"("projectId");

-- CreateIndex
CREATE INDEX "WbsItem_projectId_idx" ON "WbsItem"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "SlaRecord_projectId_idx" ON "SlaRecord"("projectId");

-- CreateIndex
CREATE INDEX "Risk_projectId_idx" ON "Risk"("projectId");

-- CreateIndex
CREATE INDEX "BudgetTransaction_projectId_idx" ON "BudgetTransaction"("projectId");

-- CreateIndex
CREATE INDEX "Approval_projectId_idx" ON "Approval"("projectId");

-- CreateIndex
CREATE INDEX "ApprovalComment_approvalId_idx" ON "ApprovalComment"("approvalId");

-- CreateIndex
CREATE INDEX "DocumentItem_projectId_idx" ON "DocumentItem"("projectId");

-- CreateIndex
CREATE INDEX "ActivityItem_projectId_idx" ON "ActivityItem"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectApp" ADD CONSTRAINT "ProjectApp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaRecord" ADD CONSTRAINT "SlaRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransaction" ADD CONSTRAINT "BudgetTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityItem" ADD CONSTRAINT "ActivityItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

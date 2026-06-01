-- Plan catalog for platform-managed pricing & limits
CREATE TABLE `PlanCatalog` (
    `plan` ENUM('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `studentsLimit` INTEGER NULL,
    `teachersLimit` INTEGER NULL,
    `adminsLimit` INTEGER NULL,
    `usdMonthly` INTEGER NOT NULL DEFAULT 0,
    `etbMonthly` INTEGER NOT NULL DEFAULT 0,
    `features` JSON NOT NULL,
    `trialDays` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isListed` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`plan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PlanCatalog` (
    `plan`, `label`, `description`, `studentsLimit`, `teachersLimit`, `adminsLimit`,
    `usdMonthly`, `etbMonthly`, `features`, `trialDays`, `sortOrder`, `isListed`, `updatedAt`
) VALUES
(
    'TRIAL',
    'Free trial',
    '14 days · up to 50 students · core features',
    50, 10, 1,
    0, 0,
    JSON_ARRAY('All core modules', 'Up to 50 students', 'Email support'),
    14, 0, false,
    CURRENT_TIMESTAMP(3)
),
(
    'STARTER',
    'Starter',
    'Small schools · up to 500 students',
    500, 50, NULL,
    99, 15650,
    JSON_ARRAY('Up to 500 students', 'Up to 50 teachers', 'Parent portal', 'Attendance, results & announcements'),
    NULL, 1, true,
    CURRENT_TIMESTAMP(3)
),
(
    'PROFESSIONAL',
    'Professional',
    'Growing schools · analytics & notifications',
    2000, NULL, NULL,
    259, 40900,
    JSON_ARRAY('Up to 2,000 students', 'Unlimited teachers', 'Analytics & notifications', 'Mobile app access'),
    NULL, 2, true,
    CURRENT_TIMESTAMP(3)
),
(
    'ENTERPRISE',
    'Enterprise',
    'Multi-campus · API · dedicated support',
    NULL, NULL, NULL,
    0, 0,
    JSON_ARRAY('Unlimited students', 'Multi-campus support', 'Advanced analytics & API', 'Dedicated support'),
    NULL, 3, true,
    CURRENT_TIMESTAMP(3)
);

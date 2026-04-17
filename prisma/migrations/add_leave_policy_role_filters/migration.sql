-- Add role-specific filters to LeavePolicy
ALTER TABLE `LeavePolicy` ADD COLUMN `applicableTo` VARCHAR(191) NOT NULL DEFAULT 'all';
ALTER TABLE `LeavePolicy` ADD COLUMN `departmentId` INTEGER NULL;
ALTER TABLE `LeavePolicy` ADD COLUMN `designationId` INTEGER NULL;

-- Add foreign key constraints
ALTER TABLE `LeavePolicy` ADD CONSTRAINT `LeavePolicy_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `LeavePolicy` ADD CONSTRAINT `LeavePolicy_designationId_fkey` FOREIGN KEY (`designationId`) REFERENCES `Designation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX `LeavePolicy_departmentId_idx` ON `LeavePolicy`(`departmentId`);
CREATE INDEX `LeavePolicy_designationId_idx` ON `LeavePolicy`(`designationId`);

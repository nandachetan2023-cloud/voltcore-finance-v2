import { PrismaClient, AttendanceLog, Employee } from '@prisma/client';
import { startOfDay, format, parse, isValid } from 'date-fns';

const prisma = new PrismaClient({});

export class BiometricService {
  /**
   * Process a punch from biometric device
   */
  static async processPunch(punchData: {
    biometric_id?: string;
    employee_code?: string;
    timestamp: string;
    device_id?: string;
    remarks?: string;
  }) {
    // 1. Find Employee
    let employee: Employee | null = null;
    if (punchData.biometric_id) {
      // Note: In our current schema, we might need to add biometric_id to Employee
      // For now, I'll use employee_code as a fallback or assume it exists in a real DB
      employee = await prisma.employee.findFirst({
        where: { employeeCode: punchData.biometric_id }
      });
    } else if (punchData.employee_code) {
      employee = await prisma.employee.findUnique({
        where: { employeeCode: punchData.employee_code }
      });
    }

    if (!employee) {
      throw new Error('Employee not found');
    }

    // 2. Parse Date/Time
    const timestamp = new Date(punchData.timestamp);
    if (!isValid(timestamp)) {
      throw new Error('Invalid timestamp format');
    }

    const logDate = startOfDay(timestamp);
    
    // 3. Check for Duplicate (within 2 minutes)
    const twoMinutesAgo = new Date(timestamp.getTime() - 2 * 60000);
    const twoMinutesLater = new Date(timestamp.getTime() + 2 * 60000);

    const duplicate = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        punchIn: {
          gte: twoMinutesAgo,
          lte: twoMinutesLater
        }
      }
    });

    if (duplicate) {
      throw new Error('Duplicate punch detected');
    }

    // 4. Get or Create Log for the day
    let log = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        logDate: logDate
      }
    });

    if (!log) {
      // New Check-in
      log = await prisma.attendanceLog.create({
        data: {
          employeeId: employee.id,
          logDate: logDate,
          punchIn: timestamp,
          status: 'present',
          source: 'biometric',
          biometricDeviceId: punchData.device_id,
        }
      });
    } else if (!log.punchOut) {
      // Check-out
      log = await prisma.attendanceLog.update({
        where: { id: log.id },
        data: {
          punchOut: timestamp,
          biometricDeviceId: punchData.device_id || log.biometricDeviceId,
        }
      });
    }

    return log;
  }

  static async bulkProcess(punches: any[]) {
    const results = [];
    for (const punch of punches) {
      try {
        const log = await this.processPunch(punch);
        results.push({ success: true, log });
      } catch (error: any) {
        results.push({ success: false, message: error.message, punch });
      }
    }
    return results;
  }
}

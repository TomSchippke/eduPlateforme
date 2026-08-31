import { prisma } from "./db";

export async function getSchoolYearBounds() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  
  // If we are before August (month 7), the school year started last year
  const startYear = currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;

  const startDate = new Date(startYear, 8, 1); // Sept 1st
  const endDate = new Date(endYear, 6, 15); // July 15th
  
  return { startDate, endDate };
}

export async function generateScheduleForTemplate(templateId: string) {
  const template = await prisma.coursTemplate.findUnique({
    where: { id: templateId },
    include: {
      groupe: true
    }
  });

  if (!template) return;

  const holidays = await prisma.schoolHoliday.findMany({
    where: { profId: template.groupe.profId }
  });

  const { endDate } = await getSchoolYearBounds();
  
  // Delete future non-exception classes for this template
  const now = new Date();
  await prisma.coursPlanifie.deleteMany({
    where: {
      templateId,
      dateTime: { gte: now },
      isException: false,
    }
  });

  // Generate from today until end of school year
  let currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  // Find next occurrence of dayOfWeek
  while (currentDate.getDay() !== template.dayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const newClasses = [];
  
  while (currentDate <= endDate) {
    // Check if currentDate is during a holiday
    const isHoliday = holidays.some(h => {
      // Create date objects for comparison without time
      const hStart = new Date(h.startDate);
      hStart.setHours(0,0,0,0);
      const hEnd = new Date(h.endDate);
      hEnd.setHours(23,59,59,999);
      return currentDate >= hStart && currentDate <= hEnd;
    });

    if (!isHoliday) {
      // Parse start and end times
      const [startH, startM] = template.startTime.split(':').map(Number);
      const [endH, endM] = template.endTime.split(':').map(Number);
      
      const classStart = new Date(currentDate);
      classStart.setHours(startH, startM, 0, 0);
      
      const classEnd = new Date(currentDate);
      classEnd.setHours(endH, endM, 0, 0);

      // Only add if it's in the future
      if (classStart > now) {
        newClasses.push({
          groupeId: template.groupeId,
          templateId: template.id,
          title: "Cours",
          dateTime: classStart,
          endTime: classEnd,
          room: template.room,
        });
      }
    }
    
    // Next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  if (newClasses.length > 0) {
    await prisma.coursPlanifie.createMany({
      data: newClasses
    });
  }
}

export async function regenerateAllSchedules(profId: string) {
  const templates = await prisma.coursTemplate.findMany({
    where: {
      groupe: {
        profId
      }
    }
  });
  
  for (const template of templates) {
    await generateScheduleForTemplate(template.id);
  }
}

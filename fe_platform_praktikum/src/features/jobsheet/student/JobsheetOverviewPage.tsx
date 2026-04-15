import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Jobsheet } from "../../../entities/jobsheet/types";
import { getJobsheets } from "../../../entities/jobsheet/service";
import Navbar from "../../../components/navbar/Navbar";
import GoalCard from "./components/GoalCard";
import SummaryCard from "./components/SummaryCard";
import SidebarCard from "./components/SidebarCard";
import TopProgressBar from "../../../components/loading/TopProgressBar";
import GoalCardSkeleton from "./components/loading/GoalSkeleton";
import SummaryCardSkeleton from "./components/loading/SummarySkeleton";
import SidebarCardSkeleton from "./components/loading/SidebarSkeleton";
import HistoryCardSkeleton from "./components/loading/HistorySkeleton";

export default function JobsheetOverviewPage() {
  const { courseId, jobsheetId } = useParams<{
    courseId: string;
    jobsheetId: string;
  }>();

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !jobsheetId) return;

    const currentCourseId = courseId;

    async function loadData() {
      try {
        const list = await getJobsheets(currentCourseId);
        const selected = list.find((j) => j.id === jobsheetId);
        setJobsheet(selected || null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [courseId, jobsheetId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* LEFT CONTENT */}
          <div className="lg:col-span-3 space-y-8">

            {/* Header Section */}
            <div>
              {loading ? (
                <>
                  <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-gray-800">
                    {jobsheet?.title}
                  </h1>
                  <p className="text-gray-500 mt-2">
                    {jobsheet?.description}
                  </p>
                </>
              )}
            </div>

            {loading ? (
              <>
                <GoalCardSkeleton />
                <SummaryCardSkeleton />
              </>
            ) : (
              <>
                <GoalCard goal={jobsheet!.goal} />
                <SummaryCard summary={jobsheet!.summary} />
              </>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1 lg:mt-20">
            {loading ? (
              <>
                <SidebarCardSkeleton />
                <HistoryCardSkeleton />
              </>
            ) : (
              <>
                <SidebarCard
                  jobsheet={jobsheet!}
                  courseId={courseId!}
                  jobsheetId={jobsheetId!}
                />
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

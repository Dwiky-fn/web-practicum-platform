import type { Jobsheet } from "../../../../entities/jobsheet/types";

interface Props {
  goal: Jobsheet["goal"];
}

export default function GoalCard({ goal }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold mb-3 text-gray-800">
        Tujuan Praktikum
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed">
        {goal}
      </p>
    </div>
  );
}
import { User, IdCard, Settings } from "lucide-react";
import type React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

type TabItem = {
  name: string;
  icon: React.ElementType;
}

export default function SettingsLayout({
  activeTab,
  setActiveTab,
  children,
}: Props) {

  const tabs: TabItem[] = [
    { name: 'Profil', icon: User },
    { name: 'Data Pribadi', icon: IdCard },
    { name: 'Akun', icon: Settings },
  ]

  return (
    <div className="max-w-7xl mx-auto px-10 py-8 grid grid-cols-12 gap-10">

      {/* Sidebar */}
      <aside className="col-span-3">
        <h2 className="text-lg font-semibold mb-6">Pengaturan</h2>

        <div className="space-y-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`
                relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-all duration-200
                ${
                  activeTab === tab.name
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-200 active:bg-blue-200"
                }
              `}
              >
                  <Icon size={18} />
                  <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Content */}
      <section className="col-span-9">
        {children}
      </section>
    </div>
  )
}
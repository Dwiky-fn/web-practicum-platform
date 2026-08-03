import { User, IdCard, Settings } from "lucide-react";
import type React from "react";

import Breadcrumbs from "../../../components/Breadcrumbs"

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

interface TabItem {
  name: string
  icon: React.ComponentType<{ className?: string; size?: number }>
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
    <div className="w-full space-y-6">
      <Breadcrumbs items={[{ label: "Pengaturan Akun" }]} />
      {/* Body Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">Menu Pengaturan</h2>

          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => setActiveTab(tab.name)}
                  className={`
                    flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-700 text-white shadow-sm"
                        : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200/80"
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Section */}
        <section className="lg:col-span-9">
          {children}
        </section>
      </div>
    </div>
  )
}
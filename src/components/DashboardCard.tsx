export const DashboardCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-primary">{title}</h3>
    <p className="text-2xl font-bold text-secondary">{value}</p>
  </div>
);
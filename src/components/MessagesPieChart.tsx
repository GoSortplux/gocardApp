import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MessagesPieChartProps {
  sent: number;
  failed: number;
}

export const MessagesPieChart = ({ sent, failed }: MessagesPieChartProps) => {
  const data = {
    labels: ['Sent', 'Failed'],
    datasets: [
      {
        data: [sent, failed],
        backgroundColor: ['#36A2EB', '#fd4a71ff'],
        hoverBackgroundColor: ['#36A2EB', '#fd4a71ff'],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Message Status',
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Pie data={data} options={options} />
    </div>
  );
};

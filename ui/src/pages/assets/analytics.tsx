import { NextPage } from 'next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetAnalytics } from '@/components/assets/AssetAnalytics';

const AssetAnalyticsPage: NextPage = () => {
  return (
    <DashboardLayout>
      <AssetAnalytics />
    </DashboardLayout>
  );
};

export default AssetAnalyticsPage;

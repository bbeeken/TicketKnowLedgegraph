import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AssetEditPage from '@/components/assets/AssetEditPage';

const AssetDetailsPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <DashboardLayout>
      <AssetEditPage assetId={id ? Number(id) : undefined} />
    </DashboardLayout>
  );
};

export default AssetDetailsPage;

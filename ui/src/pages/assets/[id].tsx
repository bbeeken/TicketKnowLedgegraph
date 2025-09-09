import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetDetails } from '@/components/assets/AssetDetails';

const AssetDetailsPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <DashboardLayout>
      <AssetDetails />
    </DashboardLayout>
  );
};

export default AssetDetailsPage;

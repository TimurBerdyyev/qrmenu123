import OrderMenu from "@/components/OrderMenu";

export default function TablePage({ params }) {
  const tableNumber = params.id;
  return <OrderMenu tableNumber={tableNumber} isTakeaway={false} />;
}

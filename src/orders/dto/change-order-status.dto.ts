import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(OrderStatusList, {
    message: `Status must be one of the following: ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}

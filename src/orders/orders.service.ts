import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { CreateOrderDto, ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { OrderPaginationDto } from 'src/common/dto/order-pagination.dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  constructor(@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy) {
    super();
  }

  private readonly logger: Logger = new Logger('OrdersService');
  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map(
        (orderItem) => orderItem.productId,
      );

      const products: any[] = await firstValueFrom(
        this.natsClient.send('validate_products', productIds),
      );

      // Calculate totalAmount
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const product = products.find(
          (product) => product.id === orderItem.productId,
        );

        return acc + product.price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce(
        (acc, orderItem) => acc + orderItem.quantity,
        0,
      );

      const order = await this.order.create({
        data: {
          total: totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                quantity: orderItem.quantity,
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException({
        message: 'Check logs',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalCount = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        where: {
          status: orderPaginationDto.status,
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      meta: {
        totalCount,
        page: currentPage,
        lastPage: Math.ceil(totalCount / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: {
        id,
      },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    try {
      const productIds = order.OrderItem.map(
        (orderItem) => orderItem.productId,
      );

      const products: any[] = await firstValueFrom(
        this.natsClient.send('validate_products', productIds),
      );

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException({
        message: 'Check logs',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    const { orderId, stripePaymentId, receiptUrl } = paidOrderDto;

    this.logger.log(`Order with id ${orderId} has been paid`);
    this.logger.log(paidOrderDto);

    const order = await this.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'CONFIRMED',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: stripePaymentId,

        OrderReceipt: {
          create: {
            receiptUrl,
          },
        },
      },
    });

    return order;
  }

  async createPaymentSession(orderWithProducts: OrderWithProducts) {
    const session = await firstValueFrom(
      this.natsClient.send('create_payment_session', {
        orderId: orderWithProducts.id,
        currency: 'USD',
        items: orderWithProducts.OrderItem.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      }),
    );

    return session;
  }
}

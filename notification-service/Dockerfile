  notification-service:
    build: ./notification-service
    container_name: notification-service
    ports:
      - "4005:4005"
    environment:
      - PORT=4005
      - NODE_ENV=development
    networks:
      - microservices-net
    depends_on:
      - postgres

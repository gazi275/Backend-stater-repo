import { Router } from "express"
import { authRoutes } from "../modules/auth/auth.routes"
import { NotificationsRouters } from "../modules/notifications/notification.routes"
import { paymentRoutes } from "../modules/payment/payment.routes"
import { SearchRoutes } from "../modules/search/search.routes"
import { UploadRoutes } from "../modules/upload/upload.route"
import { userRoutes } from "../modules/user/user.routes"
import { webhookRouter } from "../modules/webhook/webhook.Routes"

const router = Router()
const routes = [
    {
        path: "/users",
        component: userRoutes
    },
    {
        path: "/auth",
        component: authRoutes
    },
    {
        path: "/upload",
        component: UploadRoutes
    },
    {
        path: "/notifications",
        component: NotificationsRouters
    },
    {
        path: "/payments",
        component: paymentRoutes
    },
    {
        path: "/webhook",
        component: webhookRouter
    },
    {
        path: "/search",
        component: SearchRoutes
    },
]

routes.forEach(route => router.use(route.path, route.component))
export default router
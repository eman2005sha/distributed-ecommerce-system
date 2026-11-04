<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = auth('api')->user();

        if (!$user || $user->role !== $role) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'ليس لديك صلاحية لتنفيذ هذه العملية.',
                ]
            ], 403);
        }

        return $next($request);
    }
}
import Vue, { ComponentOptions } from 'vue'

// 一个构造器函数，返回V和Vue混合的对象。可以认为VueClass就是一个vue的控件的class对象
// 为什么要 & typeof Vue？？？
export type VueClass<V> = { new (...args: any[]): V & Vue } & typeof Vue

// 保存属性装饰器结果的属性。vue-class-component提供了与其配套的属性装饰器的开发函数createDecorator。
// __decorators__是用于保存属性装饰器的处理函数的
export type DecoratedClass = VueClass<Vue> & {
  // Property, method and parameter decorators created by `createDecorator` helper
  // will enqueue functions that update component options for lazy processing.
  // They will be executed just before creating component constructor.
  __decorators__?: ((options: ComponentOptions<Vue>) => void)[]
}

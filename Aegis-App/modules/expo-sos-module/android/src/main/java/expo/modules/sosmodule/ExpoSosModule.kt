package expo.modules.sosmodule

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class ExpoSosModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoSosModule")

    AsyncFunction("sendSMS") { phoneNumbers: List<String>, message: String ->
      val context: Context = appContext.reactContext ?: throw Exception("React context missing")

      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      } ?: throw Exception("SmsManager is null")

      val messageParts = smsManager.divideMessage(message)
      val errors = mutableListOf<String>()

      var isFirst = true
      for (phoneNumber in phoneNumbers) {
        if (phoneNumber.isBlank()) continue

        // Delay between messages so the radio can finish dispatching the previous one
        if (!isFirst) {
          Thread.sleep(1000)
        }
        isFirst = false

        try {
          if (messageParts.size > 1) {
            sendMultipartWithConfirmation(context, smsManager, phoneNumber, messageParts)
          } else {
            sendSingleWithConfirmation(context, smsManager, phoneNumber, message)
          }
        } catch (e: Exception) {
          errors.add("$phoneNumber: ${e.message}")
        }
      }

      if (errors.isNotEmpty()) {
        throw Exception("SMS failed for: ${errors.joinToString("; ")}")
      }

      return@AsyncFunction true
    }
  }

  private fun sendSingleWithConfirmation(
    context: Context,
    smsManager: SmsManager,
    phoneNumber: String,
    message: String
  ) {
    val latch = CountDownLatch(1)
    var sendResultCode = Activity.RESULT_OK
    val action = "SMS_SENT_${System.nanoTime()}"

    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        sendResultCode = resultCode
        latch.countDown()
        try { context.unregisterReceiver(this) } catch (_: Exception) {}
      }
    }

    registerReceiver(context, receiver, action)

    val sentIntent = PendingIntent.getBroadcast(
      context,
      System.nanoTime().toInt(),
      Intent(action),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    try {
      smsManager.sendTextMessage(phoneNumber, null, message, sentIntent, null)
    } catch (e: SecurityException) {
      try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
      throw Exception("SEND_SMS permission denied: ${e.message}")
    }

    val completed = latch.await(30, TimeUnit.SECONDS)
    if (!completed) {
      try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
      throw Exception("SMS send timed out after 30s")
    }

    if (sendResultCode != Activity.RESULT_OK) {
      throw Exception("SMS dispatch failed (code $sendResultCode: ${describeError(sendResultCode)})")
    }
  }

  private fun sendMultipartWithConfirmation(
    context: Context,
    smsManager: SmsManager,
    phoneNumber: String,
    parts: ArrayList<String>
  ) {
    val latch = CountDownLatch(parts.size)
    val failedParts = mutableListOf<Int>()

    val sentIntents = ArrayList<PendingIntent>()

    for (i in parts.indices) {
      val action = "SMS_PART_SENT_${System.nanoTime()}_$i"

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          if (resultCode != Activity.RESULT_OK) {
            synchronized(failedParts) { failedParts.add(i) }
          }
          latch.countDown()
          try { context.unregisterReceiver(this) } catch (_: Exception) {}
        }
      }

      registerReceiver(context, receiver, action)

      sentIntents.add(
        PendingIntent.getBroadcast(
          context,
          System.nanoTime().toInt(),
          Intent(action),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
    }

    try {
      smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null)
    } catch (e: SecurityException) {
      throw Exception("SEND_SMS permission denied: ${e.message}")
    }

    val completed = latch.await(30, TimeUnit.SECONDS)
    if (!completed) {
      throw Exception("Multipart SMS send timed out after 30s")
    }

    if (failedParts.isNotEmpty()) {
      throw Exception("Multipart SMS: ${failedParts.size}/${parts.size} parts failed")
    }
  }

  private fun registerReceiver(context: Context, receiver: BroadcastReceiver, action: String) {
    val filter = IntentFilter(action)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(receiver, filter)
    }
  }

  private fun describeError(code: Int): String {
    return when (code) {
      SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "generic failure"
      SmsManager.RESULT_ERROR_RADIO_OFF -> "radio off"
      SmsManager.RESULT_ERROR_NULL_PDU -> "null PDU"
      SmsManager.RESULT_ERROR_NO_SERVICE -> "no service"
      else -> "unknown ($code)"
    }
  }
}
